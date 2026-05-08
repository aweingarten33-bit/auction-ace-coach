import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        stencil: ['"Bebas Neue"', '"Anton"', '"Impact"', "sans-serif"],
        stardos: ['"Stardos Stencil"', '"Special Elite"', "monospace"],
        scoreboard: ['"Roboto Mono"', '"VT323"', "ui-monospace", "monospace"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Banksy × Football extended palette
        turf:    "hsl(var(--primary))",
        penalty: "hsl(var(--secondary))",
        blood:   "hsl(var(--accent))",
        sweat:   { DEFAULT: "hsl(var(--sweat))",  foreground: "hsl(var(--sweat-foreground))" },
        bruise:  { DEFAULT: "hsl(var(--bruise))", foreground: "hsl(var(--bruise-foreground))" },
        rust:    "hsl(var(--rust))",
        chalk:   "hsl(var(--foreground))",
        locker:  "hsl(var(--background))",
        concrete: "hsl(var(--concrete))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "var(--radius)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "slam-down": {
          "0%": { transform: "translateY(-30px)", opacity: "0" },
          "60%": { transform: "translateY(-30px)", opacity: "0" },
          "61%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "score-flash": {
          "0%, 100%": { color: "hsl(var(--foreground))" },
          "30%": { color: "hsl(var(--primary))" },
        },
        "shake-tight": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-1px)" },
          "75%": { transform: "translateX(1px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slam-down": "slam-down 0.32s steps(2) both",
        "score-flash": "score-flash 0.6s steps(2)",
        "shake-tight": "shake-tight 0.2s steps(2) infinite",
      },
      transitionTimingFunction: {
        "stencil": "steps(2)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
